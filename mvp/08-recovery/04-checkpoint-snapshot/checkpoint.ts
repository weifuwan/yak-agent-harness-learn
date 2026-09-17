import { readFile } from "node:fs/promises"
import { resolve } from "node:path"

export type FileSnapshot = {
  path: string
  content: string
}

export type RecoveryCheckpoint = {
  id: string
  files: FileSnapshot[]
}

export async function createCheckpoint(
  id: string,
  filePaths: string[],
): Promise<RecoveryCheckpoint> {
  if (!id.trim()) {
    throw new Error("checkpoint id must not be empty")
  }

  if (filePaths.length === 0) {
    throw new Error("checkpoint requires at least one file")
  }

  const files: FileSnapshot[] = []

  for (const filePath of filePaths) {
    const normalizedPath = resolve(filePath)
    const content = await readFile(normalizedPath, "utf8")

    files.push({
      path: normalizedPath,
      content,
    })
  }

  return {
    id,
    files,
  }
}

export function findSnapshot(
  checkpoint: RecoveryCheckpoint,
  filePath: string,
): FileSnapshot {
  const normalizedPath = resolve(filePath)
  const snapshot = checkpoint.files.find(
    (file) => file.path === normalizedPath,
  )

  if (!snapshot) {
    throw new Error(`No snapshot found for ${normalizedPath}`)
  }

  return snapshot
}
