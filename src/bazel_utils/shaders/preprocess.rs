use regex::Regex;
use std::collections::HashSet;
use std::error::Error;
use std::fs;
use std::path::Path;

pub fn preprocess(
    src: &String,
    base_dir: &Path,
    defines: &Vec<String>,
) -> Result<String, Box<dyn Error>> {
    Ok(preprocess_ifdef(
        &preprocess_include(src, base_dir)?,
        defines,
    )?)
}

fn preprocess_ifdef(src: &String, defines: &Vec<String>) -> Result<String, String> {
    // Very simple preprocessor that enables the use of
    // ```
    // #if defined(x)
    // ...
    // #endif
    // ```
    // in the shader code.

    let if_re = Regex::new(r"^\s*#if (!?)defined\(([^\s]+)\)").unwrap();
    let else_re = Regex::new(r"^\s*#else").unwrap();
    let endif_re = Regex::new(r"^\s*#endif").unwrap();
    let define_re = Regex::new(r"^\s*#define\s+([^\s]+)").unwrap();

    let mut out_lines: Vec<String> = Vec::new();

    let mut if_false_count: i32 = 0;
    let mut if_stack: Vec<bool> = Vec::new();

    let mut defines_set: HashSet<String> = HashSet::from_iter(defines.into_iter().cloned());

    for line in src.split("\n") {
        if if_re.is_match(line) {
            let captures = if_re.captures(line).unwrap();
            let negated = captures[1].len() > 0;
            let define = &captures[2];
            let test_passes = defines_set.contains(define) == !negated;
            if_stack.push(test_passes);
            if_false_count += if test_passes { 0 } else { 1 };
        } else if endif_re.is_match(line) {
            let endif_was_true = match if_stack.pop() {
                None => {
                    return Err("Unmatched #endif".to_string());
                }
                Some(x) => x,
            };
            if_false_count -= if endif_was_true { 0 } else { 1 };
        } else if else_re.is_match(line) {
            let endif_was_true = match if_stack.pop() {
                None => {
                    return Err("Unmatched #else".to_string());
                }
                Some(x) => x,
            };
            if_stack.push(!endif_was_true);
            if_false_count += if endif_was_true { 1 } else { -1 };
        } else if if_false_count == 0 {
            if define_re.is_match(line) {
                let maybe_def = define_re.captures(line).unwrap();
                let define = &maybe_def[1];
                defines_set.insert(define.to_string());
            }
            out_lines.push(line.to_string());
        }
    }

    if if_stack.len() > 0 {
        return Err("Some #if statements were not closed.".to_string());
    }
    assert!(if_false_count == 0);

    Ok(out_lines.join("\n"))
}

fn preprocess_include(src: &String, base_dir: &Path) -> Result<String, Box<dyn Error>> {
    // Super simple scanner for "#include" statements. Will dump included source
    // into preprocess output.
    let include_re = Regex::new(r##"^\s*#include "([^"]+)""##).unwrap();

    let mut out_lines: Vec<String> = Vec::new();

    for line in src.split("\n") {
        let maybe_include = include_re.captures(line);
        if maybe_include.is_none() {
            out_lines.push(line.to_string());
            continue;
        }

        let include = &maybe_include.as_ref().unwrap()[1];
        let base_include_path = base_dir.join(include);
        let include_src = match fs::read_to_string(&base_include_path) {
            Ok(x) => x,
            Err(_e) => {
                // Try again with the current working directory as the base.
                match fs::read_to_string(&include) {
                    Ok(x) => x,
                    Err(e) => {
                        return Err(
                            format!("Error opening #include file '{}': {}", include, e).into()
                        )
                    }
                }
            }
        };

        // Recurse to get all the transitive includes.
        let resolved_src = preprocess_include(&include_src, base_dir)?;
        out_lines.extend(resolved_src.split("\n").map(|l| l.to_string()));
    }

    Ok(out_lines.join("\n"))
}
