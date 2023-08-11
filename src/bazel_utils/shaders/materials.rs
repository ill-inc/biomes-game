use serde::{Deserialize, Serialize};
use serde_json;

use std::error::Error;
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MaterialType {
    Translucent,
    Base,
    Raw,
    Punchthrough,
    NoDepth,
}

#[derive(Serialize, Deserialize)]
pub struct Material {
    pub material_type: MaterialType,
    pub fs: String,
    pub vs: String,
    pub defines: Option<Vec<String>>,
    pub blending: Option<bool>,
}

pub fn parse_material_string(content: &str) -> Result<Material, Box<dyn Error>> {
    Ok(serde_json::from_str(content)?)
}

pub fn parse_material_file(path: &Path) -> Result<Material, Box<dyn Error>> {
    let contents = &fs::read_to_string(path)?;

    Ok(parse_material_string(contents)?)
}
