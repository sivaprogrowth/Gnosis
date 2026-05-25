import path from "path"
import { FilePath } from "./path"
import { globby } from "globby"

export function toPosixPath(fp: string): string {
  return fp.split(path.sep).join("/")
}

export async function glob(
  pattern: string,
  cwd: string,
  ignorePatterns: string[],
): Promise<FilePath[]> {
  // gitignore: false — content/ is gitignored in this repo because it's
  // regenerated each build by scripts/build-content.cjs from the canonical
  // vault. Honoring .gitignore would hide every content/ file from globby
  // and Quartz would parse 0 files. Quartz's own `ignorePatterns` config
  // (in quartz.config.ts) handles site-level filtering.
  const fps = (
    await globby(pattern, {
      cwd,
      ignore: ignorePatterns,
      gitignore: false,
    })
  ).map(toPosixPath)
  return fps as FilePath[]
}
