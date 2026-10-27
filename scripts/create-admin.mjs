/**
 * MPT-AI: Super Admin Provisioning Script
 * Creates or resets the Super Admin account in Supabase.
 *
 * Usage:
 *   node scripts/create-admin.mjs <email> <password>
 * Example:
 *   node scripts/create-admin.mjs admin@mpt-ai.org MySecretPass123!
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

const email = process.argv[2] || process.env.ADMIN_EMAIL || 'admin@mpt-ai.org'
const password = process.argv[3] || process.env.ADMIN_PASSWORD || 'Admin123456!'

console.log('='.repeat(65))
console.log('  MPT-AI — Super Admin Account Provisioning')
console.log('='.repeat(65))

if (!supabaseUrl) {
  console.error('\n❌ ERROR: VITE_SUPABASE_URL is missing in .env')
  process.exit(1)
}

if (serviceKey) {
  console.log('🔑 Using SUPABASE_SERVICE_ROLE_KEY (direct admin provisioning)...')
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Super Admin' },
  })

  if (error) {
    if (error.message?.includes('already been registered') || error.code === 'email_exists') {
      console.log(`ℹ️ User ${email} already exists. Updating password and ensuring admin role...`)
      // Find user id
      const { data: listData } = await adminClient.auth.admin.listUsers()
      const existingUser = listData?.users?.find((u) => u.email === email)
      if (existingUser) {
        await adminClient.auth.admin.updateUserById(existingUser.id, {
          password,
          email_confirm: true,
        })
        await adminClient.from('profiles').upsert({
          id: existingUser.id,
          email,
          full_name: 'Super Admin',
          role: 'admin',
          updated_at: new Date().toISOString(),
        })
        console.log(`✅ Admin credentials updated!`)
        console.log(`   Email   : ${email}`)
        console.log(`   Password: ${password}`)
        console.log(`   Role    : admin\n`)
        process.exit(0)
      }
    }
    console.error('❌ Failed to provision admin user:', error.message)
    process.exit(1)
  }

  const userId = data.user?.id
  if (userId) {
    await adminClient.from('profiles').upsert({
      id: userId,
      email,
      full_name: 'Super Admin',
      role: 'admin',
      updated_at: new Date().toISOString(),
    })
  }

  console.log('\n🎉 Super Admin account created successfully!')
  console.log(`   Email   : ${email}`)
  console.log(`   Password: ${password}`)
  console.log(`   Role    : admin\n`)
} else {
  console.log('📡 Using VITE_SUPABASE_ANON_KEY to register first user...')
  const client = createClient(supabaseUrl, anonKey)
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: 'Super Admin' },
    },
  })

  if (error) {
    console.error('\n❌ Sign up notice:', error.message)
    console.log('\n💡 Recommendation: To create the Super Admin directly without email confirmation:')
    console.log('   Add your SUPABASE_SERVICE_ROLE_KEY to .env and run this script again, OR')
    console.log('   Create the user in Supabase Dashboard -> Authentication -> Users -> Add User.\n')
    process.exit(1)
  }

  console.log('\n✅ Account registration submitted!')
  console.log(`   Email   : ${email}`)
  console.log(`   Password: ${password}`)
  if (data.session) {
    console.log('   Session : Active (Super Admin confirmed)')
  } else {
    console.log('   Status  : Confirmation required (or auto-confirmed if disabled in Supabase Auth settings)')
  }
  console.log('\n   Because public.profiles was empty, the database trigger assigns role "admin" to this first user.\n')
}
