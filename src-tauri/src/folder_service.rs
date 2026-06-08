use std::fs;
use std::path::PathBuf;

use crate::models::ProposalFolderRequest;

const SUBFOLDERS: [&str; 5] = [
    "input-files",
    "prompts",
    "final-documents",
    "exports",
    "config",
];

pub fn create_proposal_folder_structure(
    input: ProposalFolderRequest,
) -> Result<Vec<String>, String> {
    let root = build_proposal_folder_path(&input);
    fs::create_dir_all(&root).map_err(|error| error.to_string())?;

    let mut created = vec![root.to_string_lossy().to_string()];
    for subfolder in SUBFOLDERS {
        let path = root.join(subfolder);
        fs::create_dir_all(&path).map_err(|error| error.to_string())?;
        created.push(path.to_string_lossy().to_string());
    }

    Ok(created)
}

fn build_proposal_folder_path(input: &ProposalFolderRequest) -> PathBuf {
    let folder_name = format!(
        "{}_{}_{}",
        input.proposal_number,
        sanitize_folder_name(&input.client_name),
        sanitize_folder_name(&input.project_name)
    );

    PathBuf::from(&input.base_path)
        .join("proposals")
        .join(&input.year)
        .join(folder_name)
}

fn sanitize_folder_name(value: &str) -> String {
    value
        .chars()
        .map(|character| {
            if matches!(character, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*')
                || character.is_control()
            {
                '_'
            } else if character.is_whitespace() {
                '_'
            } else {
                character
            }
        })
        .collect::<String>()
        .split('_')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("_")
}
