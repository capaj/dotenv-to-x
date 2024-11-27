import { readFileSync, readdirSync } from 'fs'
import { $ } from 'bun'
import { select } from '@inquirer/prompts'

const getDotfiles = () => {
  return readdirSync(process.cwd()).filter(
    (file) => file.startsWith('.') && file !== '.git',
  )
}

export const github = async () => {
  let envFile = process.argv[2]

  if (!envFile) {
    const dotfiles = getDotfiles()
    const hasDotEnv = dotfiles.includes('.env')
    const hasDotDevVars = dotfiles.includes('.dev.vars')
    const answers = await select({
      message: 'Select a dotfile to use:',
      choices: dotfiles.map((file) => ({ name: file, value: file })),
      default: hasDotEnv ? '.env' : hasDotDevVars ? '.dev.vars' : dotfiles[0],
    })
    envFile = answers
  }

  // read current git repository owner and name from git remote
  const gitRemoteOutput = await $`git remote get-url origin`
  const [owner, repo] = gitRemoteOutput.stdout
    .toString()
    .split(':')[1]
    .replace('.git', '')
    .split('/')

  console.log(
    `setting secrets from ${envFile} to Owner: ${owner}, Repo: ${repo}`,
  )

  const createGitHubSecret = async (key: string, value: string) => {
    await $`gh secret set ${key} -b "${value}"`
  }

  const envContent = readFileSync(envFile, 'utf-8')
  const envVariables = envContent
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))

  await Promise.all(
    envVariables.map(async (envVar) => {
      const [key, ...valueParts] = envVar.split('=')
      const value = valueParts.join('=').trim().replace(/"/g, '')
      await createGitHubSecret(key.trim(), value)
    }),
  )

  console.log(`${envVariables.length} gitHub secrets set successfully`)
}
