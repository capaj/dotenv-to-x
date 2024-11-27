import { readFileSync, readdirSync } from 'fs'
import { $ } from 'bun'
import { select } from '@inquirer/prompts'

const getDotfiles = () => {
  return readdirSync(process.cwd()).filter(
    (file) => file.startsWith('.') && file !== '.git',
  )
}

export const cloudflare = async () => {
  let envFile = process.argv[2]

  if (!envFile) {
    const dotfiles = getDotfiles()
    const hasDotDevVars = dotfiles.includes('.dev.vars')
    const answers = await select({
      message: 'Select a dotfile to use:',
      choices: dotfiles.map((file) => ({ name: file, value: file })),
      default: hasDotDevVars ? '.dev.vars' : dotfiles[0],
    })
    envFile = answers
  }

  const createCloudflareSecret = async (key: string, value: string) => {
    await $`echo ${value} | wrangler secret put ${key}`
  }

  const envContent = readFileSync(envFile, 'utf-8')
  const envVariables = envContent
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))

  for (const envVar of envVariables) {
    const [key, ...valueParts] = envVar.split('=')
    const value = valueParts.join('=').trim().replace(/"/g, '')
    await createCloudflareSecret(key.trim(), value)
  }

  console.log(`${envVariables.length} Cloudflare secrets set successfully`)
}
