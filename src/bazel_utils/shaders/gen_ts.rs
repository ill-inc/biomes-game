use clap::Parser;
use convert_case::{Case, Casing};
use glsl::syntax::{TypeSpecifier, TypeSpecifierNonArray};
use materials::{parse_material_file, Material, MaterialType};
use shader_link_info::{
    get_array_size, parse_shader_link_info, program_link_info, ProgramLinkInfo, ShaderLinkInfo,
    ShaderType, VarMap, VariableAndType,
};
use shader_preprocessor::preprocess;
use std::collections::HashMap;
use std::error::Error;
use std::fs;
use std::io::Write;
use std::path::Path;
use std::process::{Command, Stdio};

const GENERATED_FILE_PREAMBLE: &str =
    "// GENERATED: This file is generated. Do not modify directly.";

fn main() {
    let args = Args::parse();

    if args.glslang_validator.is_none() {
        eprintln!("Warning, no glslangValidator path specified, shaders will not be checked for correctness.");
    }

    let material = match parse_material_file(Path::new(&args.material_file)) {
        Ok(x) => x,
        Err(e) => {
            eprintln!(
                "Error parsing material file '{}': {}",
                args.material_file, e
            );
            std::process::exit(1);
        }
    };

    let material_file_dir = Path::new(&args.material_file).parent().unwrap();

    let parse_or_exit =
        |path: &String, glslang_validator: &Option<String>, shader_type: ShaderType| {
            let resolved_path = material_file_dir.join(Path::new(path));
            match get_shader_info(
                &resolved_path,
                material.defines.as_ref().unwrap_or(&Vec::new()),
                glslang_validator,
                shader_type,
            ) {
                Ok(x) => x,
                Err(e) => {
                    eprintln!("Error parsing shader '{}': {}", path, e);
                    std::process::exit(1);
                }
            }
        };

    let vs_info = parse_or_exit(&material.vs, &args.glslang_validator, ShaderType::Vertex);
    let fs_info = parse_or_exit(&material.fs, &args.glslang_validator, ShaderType::Fragment);

    let results = match generate_typescript(&args.name, &material, args.galois, &vs_info, &fs_info)
    {
        Ok(x) => x,
        Err(e) => {
            eprintln!("Error generating program for '{}': {}", args.name, e);
            std::process::exit(1);
        }
    };

    let out_dir_path = Path::new(&args.out_dir);

    fn write_or_exit(path: &Path, contents: &String) {
        match fs::write(path, contents) {
            Ok(x) => x,
            Err(e) => {
                eprintln!("Error writing to output file '{}': {}", path.display(), e);
                std::process::exit(1);
            }
        }
    }

    write_or_exit(
        &out_dir_path.join(format!("{}.ts", args.name)),
        &results.bindings_src,
    );

    write_or_exit(
        &out_dir_path.join(format!("{}_shaders.ts", args.name)),
        &results.shaders_src,
    );
}

// Parses vertex and fragment shaders and outputs TypeScript that embeds them.
#[derive(Parser, Debug)]
#[command(about="Embeds shaders into TypeScript and generates bindings for them.", long_about = None)]
struct Args {
    /// Name of the shader (snake case), will be embedded in generated files.
    #[arg(short, long)]
    name: String,

    /// Path to the material file that defines the material characteristics
    #[arg(short, long, value_enum)]
    material_file: String,

    /// Flag indicating if we're building a shader for Galois or not.
    #[arg(short, long)]
    galois: bool,

    /// The directory the generated files will be placed in. Filenames based
    /// on --name.
    #[arg(short, long)]
    out_dir: String,

    /// Path to glslangValidator, for checking that the input shaders are valid.
    #[arg(long)]
    glslang_validator: Option<String>,
}

struct ShaderInfo {
    link_info: ShaderLinkInfo,
    source: String,
}

// Captures all the per-shader processing:
//  1. Apply preprocessing.
//  2. Validate shader.
//  3. Parse it to extract link data.
fn get_shader_info(
    path: &Path,
    defines: &Vec<String>,
    glslang_validator: &Option<String>,
    shader_type: ShaderType,
) -> Result<ShaderInfo, Box<dyn Error>> {
    let source = &fs::read_to_string(path)?;
    let preprocessed = preprocess(&source, path.parent().unwrap(), defines)?;

    if glslang_validator.is_some() {
        let args = match shader_type {
            ShaderType::Vertex => vec!["-S", "vert"],
            ShaderType::Fragment => vec!["-S", "frag"],
        };

        run_glslang_validator(
            glslang_validator.as_ref().unwrap(),
            &args,
            preprocessed.as_str(),
        )?;
    }

    Ok(ShaderInfo {
        link_info: parse_shader_link_info(&preprocessed, shader_type)?,
        source: preprocessed,
    })
}

fn run_glslang_validator(
    glslang_validator_path: &str,
    args: &Vec<&str>,
    input: &str,
) -> Result<(), Box<dyn Error>> {
    let validator_path = Path::new(glslang_validator_path);

    let mut command = Command::new(validator_path);
    command.arg("--stdin").stdin(Stdio::piped());
    for arg in args {
        command.arg(arg);
    }

    let mut process = match command.spawn() {
        Ok(x) => x,
        Err(e) => {
            // Explicitly wrap the error so that we can insert the
            // glslangValidator path we attempted to use into the error message.
            return Err(format!(
                "Error trying to run glslangValidator (at path '{}'): {}",
                validator_path.display(),
                e
            )
            .into());
        }
    };

    process
        .stdin
        .as_mut()
        .unwrap()
        .write_all(input.as_bytes())?;
    let exit_status = process.wait()?;

    if !exit_status.success() {
        return Err("glslangValidator reported errors.".into());
    }

    Ok(())
}

struct GeneratedTypeScript {
    // The TypeScript bindings code that the rest of the code interfaces with.
    bindings_src: String,
    // The shader source code data, laid out as TypeScript constants.
    shaders_src: String,
}

fn generate_typescript(
    name: &String,
    material: &Material,
    galois: bool,
    vs_info: &ShaderInfo,
    fs_info: &ShaderInfo,
) -> Result<GeneratedTypeScript, Box<dyn Error>> {
    Ok(GeneratedTypeScript {
        bindings_src: generate_bindings_src(
            name,
            material,
            galois,
            &program_link_info(&vs_info.link_info, &fs_info.link_info)?,
        )?,
        shaders_src: generate_shaders_src(name, vs_info, fs_info),
    })
}

fn generate_shaders_src(name: &String, vs_info: &ShaderInfo, fs_info: &ShaderInfo) -> String {
    let uc_name = name.as_str().to_case(Case::UpperCamel);
    format!(
        r###"
{GENERATED_FILE_PREAMBLE}

const {uc_name}Shaders = {{
    vertexShader: `{}`,

    fragmentShader: `{}`,
}}

export {{ {uc_name}Shaders }};
    "###,
        vs_info.source, fs_info.source
    )
}

fn generate_bindings_src(
    name: &String,
    material: &Material,
    galois: bool,
    program_link_info: &ProgramLinkInfo,
) -> Result<String, Box<dyn Error>> {
    let uc_name = name.as_str().to_case(Case::UpperCamel);

    let uniforms = remove_three_managed_uniforms(&program_link_info.uniforms);
    let sorted_uniforms = sorted_var_map(&uniforms);

    let material_import = match material.material_type {
        MaterialType::Base => {
            r#"import { BasePassMaterial } from "@/client/game/renderers/base_pass_material";"#
        }
        MaterialType::Punchthrough => {
            r#"import { PunchthroughMaterial } from "@/client/game/renderers/punchthrough_material";"#
        }
        _ => "",
    };

    let hot_reload_init = gen_hot_reload_init(galois, name);
    let uniform_interface_def = gen_uniform_interface_def(&uc_name, &sorted_uniforms)?;
    let make_material_def = gen_make_material_def(&uc_name, &sorted_uniforms, material)?;
    let check_hot_reload_fn_def = gen_check_hot_reload_fn_def(&uc_name);
    let update_material_def = gen_update_material_fn_def(&uc_name, &sorted_uniforms);

    Ok(format!(
        r###"
{GENERATED_FILE_PREAMBLE}

import * as THREE from "three";
import {{ {uc_name}Shaders }} from "./{name}_shaders";
{material_import}

{uniform_interface_def}

let shaderVersion = 0;
{hot_reload_init}

{make_material_def}

{check_hot_reload_fn_def}

{update_material_def}
        "###,
    ))
}

fn gen_hot_reload_init(galois: bool, name: &String) -> String {
    if galois {
        "".to_string()
    } else {
        format!(
            r#"
        module.hot &&
        module.hot.accept("./{name}_shaders", () => {{
            shaderVersion++;
        }});
    "#
        )
    }
}

fn gen_uniform_interface_def(
    uc_name: &String,
    sorted_uniforms: &SortedVarRefs,
) -> Result<String, String> {
    let uniform_defs = uniform_defs(&sorted_uniforms)?;
    Ok(format!(
        r#"
    export interface {uc_name}Uniforms {{
        {uniform_defs}
    }}
    "#
    ))
}

fn gen_make_material_def(
    uc_name: &String,
    sorted_uniforms: &SortedVarRefs,
    material: &Material,
) -> Result<String, String> {
    let uniform_params_with_defaults = uniform_params_with_defaults(&sorted_uniforms)?;
    let uniform_new_assignments = uniform_new_assignments(&sorted_uniforms);

    let is_transparent = material.material_type == MaterialType::Translucent;
    let is_nodepth = material.material_type == MaterialType::NoDepth;
    let transparent = if is_transparent { "true" } else { "false" };
    let depth_write = if is_transparent || is_nodepth { "false" } else { "true" };
    let resolved_blending = match material.blending {
        None => is_transparent,
        Some(x) => x,
    };
    let three_blending = if resolved_blending {
        "THREE.NormalBlending"
    } else {
        "THREE.NoBlending"
    };

    let material_class = match material.material_type {
        MaterialType::Base => "BasePassMaterial",
        MaterialType::Punchthrough => "PunchthroughMaterial",
        _ => "THREE.RawShaderMaterial",
    };

    Ok(format!(
        r#"
    export function make{uc_name}Material({{
        {uniform_params_with_defaults}
    }}: Partial<{uc_name}Uniforms>) {{
        const material = new {material_class}({{
            uniforms: {{
                {uniform_new_assignments}
                shaderVersion: {{ value: shaderVersion }},
            }},
            vertexShader: {uc_name}Shaders.vertexShader,
            fragmentShader: {uc_name}Shaders.fragmentShader,
            transparent: {transparent},
            depthWrite: {depth_write},
            blending: {three_blending},
        }});
        return material;
    }}
    "#
    ))
}

fn gen_check_hot_reload_fn_def(uc_name: &String) -> String {
    format!(
        r#"
    export function check{uc_name}HotReload(material: THREE.RawShaderMaterial) {{
        if (material && shaderVersion !== material.uniforms.shaderVersion?.value) {{
            material.vertexShader = {uc_name}Shaders.vertexShader;
            material.fragmentShader = {uc_name}Shaders.fragmentShader;
            material.uniforms.shaderVersion = {{ value: shaderVersion }};
            material.needsUpdate = true;
            return true;
        }}
        return false;
    }}
        "#
    )
}

fn gen_update_material_fn_def(uc_name: &String, sorted_uniforms: &SortedVarRefs) -> String {
    let uniform_update_assignments = uniform_update_assignments(&sorted_uniforms);

    format!(
        r#"
    export function update{uc_name}Material(
        // eslint-disable-next-line unused-imports/no-unused-vars
        material: THREE.RawShaderMaterial,
        uniforms: Partial<{uc_name}Uniforms>
    ) {{
        {uniform_update_assignments}

        check{uc_name}HotReload(material);
    }}
    "#,
    )
}

pub type VarMapRef<'a> = HashMap<&'a String, &'a VariableAndType>;
pub type SortedVarRefs<'a> = Vec<(&'a &'a std::string::String, &'a &'a VariableAndType)>;

fn remove_three_managed_uniforms<'a>(uniforms: &'a VarMap) -> VarMapRef<'a> {
    const THREE_MANAGED_UNIFORMS: &'static [&'static str] = &[
        "modelViewMatrix",
        "normalMatrix",
        "modelMatrix",
        "projectionMatrix",
    ];
    uniforms
        .into_iter()
        .map(|x| (x.0, x.1))
        .filter(|x| !THREE_MANAGED_UNIFORMS.iter().any(|c| *c == x.0.as_str()))
        .collect()
}

fn sorted_var_map<'a>(var_map: &'a VarMapRef) -> SortedVarRefs<'a> {
    let mut sorted = var_map
        .into_iter()
        .collect::<Vec<(&&String, &&VariableAndType)>>();
    sorted.sort_by(|a, b| a.0.partial_cmp(b.0).unwrap());
    return sorted;
}

fn uniform_defs(uniforms: &SortedVarRefs) -> Result<String, String> {
    let mut lines: Vec<String> = Vec::new();
    for (_, value) in uniforms {
        lines.push(format!(
            "{}: {};",
            value.name.clone(),
            to_ts_type(&value.ty)?
        ));
    }

    Ok(lines.join("\n"))
}

fn uniform_params_with_defaults(uniforms: &SortedVarRefs) -> Result<String, String> {
    let mut lines: Vec<String> = Vec::new();
    for (_, value) in uniforms {
        lines.push(format!(
            "{} = {},",
            value.name.clone(),
            to_ts_default_value(&value)?.unwrap_or("undefined".to_string())
        ));
    }

    Ok(lines.join("\n"))
}

fn uniform_new_assignments(uniforms: &SortedVarRefs) -> String {
    uniforms
        .into_iter()
        .map(|x| {
            let name = &x.1.name;
            format!("{name}: {{ value: {name} }},")
        })
        .collect::<Vec<String>>()
        .join("\n")
}

fn uniform_update_assignments(uniforms: &SortedVarRefs) -> String {
    uniforms
        .into_iter()
        .map(|x| {
            let name = &x.1.name;
            format!(
                "
            if (uniforms.{name} !== undefined) {{
                material.uniforms.{name} = {{ value: uniforms.{name} }};
            }}
            "
            )
        })
        .collect::<Vec<String>>()
        .join("\n")
}

fn to_ts_base_type(ty: &TypeSpecifierNonArray) -> Result<&'static str, String> {
    let ret = match ty {
        TypeSpecifierNonArray::Int => "number",
        TypeSpecifierNonArray::UInt => "number",
        TypeSpecifierNonArray::Float => "number",
        TypeSpecifierNonArray::Bool => "boolean",
        TypeSpecifierNonArray::Vec2 => "[number, number]",
        TypeSpecifierNonArray::Vec3 => "[number, number, number]",
        TypeSpecifierNonArray::Vec4 => "[number, number, number, number]",
        TypeSpecifierNonArray::IVec2 => "[number, number]",
        TypeSpecifierNonArray::IVec3 => "[number, number, number]",
        TypeSpecifierNonArray::IVec4 => "[number, number, number, number]",
        TypeSpecifierNonArray::Mat2 => "number[]",
        TypeSpecifierNonArray::Mat3 => "number[]",
        TypeSpecifierNonArray::Mat4 => "number[]",
        TypeSpecifierNonArray::Sampler1D => "THREE.Texture",
        TypeSpecifierNonArray::Sampler2D => "THREE.Texture",
        TypeSpecifierNonArray::Sampler3D => "THREE.Data3DTexture",
        TypeSpecifierNonArray::SamplerCube => "THREE.CubeTexture",
        TypeSpecifierNonArray::Sampler1DArray => "THREE.Texture",
        TypeSpecifierNonArray::Sampler2DArray => "THREE.DataArrayTexture",
        TypeSpecifierNonArray::USampler1D => "THREE.Texture",
        TypeSpecifierNonArray::USampler2D => "THREE.Texture",
        TypeSpecifierNonArray::USampler3D => "THREE.Data3DTexture",
        TypeSpecifierNonArray::USamplerCube => "THREE.CubeTexture",
        TypeSpecifierNonArray::USampler1DArray => "THREE.Texture",
        TypeSpecifierNonArray::USampler2DArray => "THREE.DataArrayTexture",

        x => {
            return Err(format!(
                "No supported TypeScript conversion for type: {:?}",
                x
            ));
        }
    };

    Ok(ret)
}

fn to_ts_type(ty: &TypeSpecifier) -> Result<String, String> {
    let base_type = to_ts_base_type(&ty.ty)?;
    if ty.array_specifier.is_none() {
        Ok(base_type.to_string())
    } else {
        get_array_size(ty.array_specifier.as_ref().unwrap())?;
        Ok(format!("{}[]", base_type))
    }
}

fn to_ts_default_value(value: &VariableAndType) -> Result<Option<String>, String> {
    let default_no_array = match value.ty.ty {
        TypeSpecifierNonArray::Int => "0",
        TypeSpecifierNonArray::UInt => "0",
        TypeSpecifierNonArray::Float => "0",
        TypeSpecifierNonArray::Bool => "false",
        TypeSpecifierNonArray::Vec2 => "[0, 0]",
        TypeSpecifierNonArray::Vec3 => "[0, 0, 0]",
        TypeSpecifierNonArray::Vec4 => "[0, 0, 0, 0]",
        TypeSpecifierNonArray::IVec2 => "[0, 0]",
        TypeSpecifierNonArray::IVec3 => "[0, 0, 0]",
        TypeSpecifierNonArray::IVec4 => "[0, 0, 0, 0]",
        TypeSpecifierNonArray::Mat2 => "new Array(4).fill(0)",
        TypeSpecifierNonArray::Mat3 => "new Array(9).fill(0)",
        TypeSpecifierNonArray::Mat4 => "new Array(16).fill(0)",

        _ => {
            return Ok(None);
        }
    }
    .to_string();

    if value.ty.array_specifier.is_none() {
        Ok(Some(default_no_array))
    } else {
        let array_dim = get_array_size(value.ty.array_specifier.as_ref().unwrap())?;
        Ok(Some(format!(
            "Array.from(Array({array_dim}).keys(), () => {default_no_array})"
        )))
    }
}
