use glsl::parser::Parse as _;
use glsl::syntax::{
    ArraySpecifier, ArraySpecifierDimension, Expr, PreprocessorVersion, ShaderStage,
    SingleDeclaration, StorageQualifier, TypeQualifierSpec, TypeSpecifier,
};
use glsl::visitor::{Host, Visit};
use std::collections::HashMap;
use std::error::Error;

#[derive(Clone)]
pub enum ShaderType {
    Vertex,
    Fragment,
}

#[derive(Clone)]
pub struct ShaderLinkInfo {
    pub shader_type: ShaderType,
    pub uniforms: VarMap,
    pub in_varyings: VarMap,
    pub out_varyings: VarMap,
    pub version: Option<PreprocessorVersion>,
}
pub type VarMap = HashMap<String, VariableAndType>;

#[derive(Clone)]
pub struct VariableAndType {
    pub name: String,
    pub ty: TypeSpecifier,
}

pub fn parse_shader_link_info(
    source: &String,
    shader_type: ShaderType,
) -> Result<ShaderLinkInfo, Box<dyn Error>> {
    let mut shader_info = ShaderLinkInfo {
        shader_type,
        uniforms: HashMap::new(),
        in_varyings: HashMap::new(),
        out_varyings: HashMap::new(),
        version: None,
    };

    let parsed = ShaderStage::parse(source.clone())?;

    impl glsl::visitor::Visitor for ShaderLinkInfo {
        fn visit_preprocessor_version(&mut self, declaration: &PreprocessorVersion) -> Visit {
            self.version = Some(declaration.clone());
            glsl::visitor::Visit::Parent
        }

        fn visit_single_declaration(&mut self, declaration: &SingleDeclaration) -> Visit {
            let qualifiers = match &declaration.ty.qualifier {
                None => return glsl::visitor::Visit::Parent,
                Some(x) => &x.qualifiers,
            };

            for qualifier in qualifiers.into_iter() {
                if declaration.name.is_none() {
                    continue;
                }
                let add_to_map = |map: &mut VarMap| {
                    let name = &declaration.name.as_ref().unwrap().0;
                    let mut ty = declaration.ty.ty.clone();
                    // If the array is specified after the variable, the array specifier
                    // is attached to the declaration, e.g.
                    //
                    //   uniform uint sampleIndex[32];
                    //
                    // but if it is attached to the type, then it is parsed as part of the
                    // type, e.g.
                    //
                    //  uniform uint[32] sampleIndex;
                    //
                    // Both of these are semantically the same, they just get parsed differently,
                    // In the latter case, we re-attach the array specifier to the type here so
                    // that clients do not need to concern themselves with this.
                    if declaration.array_specifier.is_some() {
                        assert!(
                            ty.array_specifier.is_none(),
                            "We don't support arrays on both the type and the variable."
                        );
                        ty.array_specifier =
                            Some(declaration.array_specifier.as_ref().unwrap().clone());
                    }

                    map.insert(
                        name.clone(),
                        VariableAndType {
                            name: name.clone(),
                            ty,
                        },
                    );
                };

                match qualifier {
                    TypeQualifierSpec::Storage(StorageQualifier::Uniform) => {
                        add_to_map(&mut self.uniforms);
                    }
                    TypeQualifierSpec::Storage(StorageQualifier::In)
                    | TypeQualifierSpec::Storage(StorageQualifier::Attribute) => {
                        add_to_map(&mut self.in_varyings);
                    }
                    TypeQualifierSpec::Storage(StorageQualifier::Out) => {
                        add_to_map(&mut self.out_varyings);
                    }
                    TypeQualifierSpec::Storage(StorageQualifier::Varying) => {
                        add_to_map(match self.shader_type {
                            ShaderType::Vertex => &mut self.out_varyings,
                            ShaderType::Fragment => &mut self.in_varyings,
                        });
                    }
                    _ => {}
                };
            }
            glsl::visitor::Visit::Parent
        }
    }

    parsed.visit(&mut shader_info);

    Ok(shader_info)
}

pub fn get_array_size(array_specifier: &ArraySpecifier) -> Result<u32, String> {
    let dimensions = &array_specifier.dimensions;
    if dimensions.0.len() > 1 {
        Err(format!(
            "Multi-dimensional arrays not supported (while parsing {:?})",
            array_specifier
        ))
    } else {
        match &dimensions.0[0] {
            ArraySpecifierDimension::ExplicitlySized(expr) => {
                match **expr {
                    Expr::IntConst(i) => match i.try_into() {
                        Ok(u) => Ok(u),
                        Err(_) => Err(format!("Not a valid array size: {}", i))
                    },
                    Expr::UIntConst(n) => Ok(n),
                    _ => Err(format!("Only constant integer expressions supported for array sizes (while parsing {:?})", array_specifier))
                }
            }
            ArraySpecifierDimension::Unsized => Err(format!("Unspecified array sizes not supported (while parsing {:?})", array_specifier))
        }
    }
}

pub struct ProgramLinkInfo {
    pub uniforms: VarMap,
    pub in_varyings: VarMap,
}

fn merge_uniforms(vs_info: &ShaderLinkInfo, fs_info: &ShaderLinkInfo) -> VarMap {
    (&vs_info.uniforms)
        .into_iter()
        .chain(&fs_info.uniforms)
        .map(|x| (x.0.clone(), x.1.clone()))
        .collect()
}

// Merge the link information for vertex shaders and fragment shaders into a
// program link info struct. Do some error checking along the way, e.g. ensuring
// that varyings match up between vertex and fragment shaders.
pub fn program_link_info(
    vs: &ShaderLinkInfo,
    fs: &ShaderLinkInfo,
) -> Result<ProgramLinkInfo, String> {
    if vs.version != fs.version {
        return Err(format!(
            "Shader versions don't match between vertex ({:?}) and fragment ({:?}) shaders.",
            vs.version, fs.version
        ));
    }
    // Make sure the vertex shader output varyings match the fragment shader input varyings.
    for (_, fs_in_varying) in &fs.in_varyings {
        let in_varying = vs.out_varyings.get(&fs_in_varying.name);
        if in_varying.is_none() {
            return Err(format!(
                "Could not find fragment input varying '{}' as vertex output varying.",
                fs_in_varying.name
            )
            .into());
        }
        if fs_in_varying.ty != in_varying.unwrap().ty {
            return Err(format!(
                "Type mismatch for varying '{}' between vertex and fragment shader.",
                fs_in_varying.name
            )
            .into());
        }
    }

    let merged_uniforms = merge_uniforms(&vs, &fs);
    if merged_uniforms.len() < vs.uniforms.len() + fs.uniforms.len() {
        return Err(
            "Vertex and fragment shaders share at least one uniform with the same name.".into(),
        );
    }

    Ok(ProgramLinkInfo {
        uniforms: merged_uniforms,
        in_varyings: vs.in_varyings.clone(),
    })
}
