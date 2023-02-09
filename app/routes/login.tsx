import type { ActionArgs, LoaderArgs, MetaFunction } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'

import { createUserSession, getUserId } from '~/session.server'
import { safeRedirect, validateEmail } from '@utils/auth'
import { verifyLogin } from '@models/auth.server'
import { SignInForm } from '@components/sign-in-form'

export async function loader({ request }: LoaderArgs) {
  const userId = await getUserId(request)
  if (userId) return redirect('/')
  return json({})
}

// export async function action({ request }: ActionArgs) {
//   const formData = await request.formData()
//   const email = formData.get('email')
//   const password = formData.get('password')
//   const redirectTo = safeRedirect(formData.get('redirectTo'), '/')
//   const remember = formData.get('remember')

//   if (!validateEmail(email)) {
//     return json(
//       { errors: { email: 'Email is invalid', password: null } },
//       { status: 400 },
//     )
//   }

//   if (typeof password !== 'string' || password.length === 0) {
//     return json(
//       { errors: { email: null, password: 'Password is required' } },
//       { status: 400 },
//     )
//   }

//   if (password.length < 8) {
//     return json(
//       { errors: { email: null, password: 'Password is too short' } },
//       { status: 400 },
//     )
//   }

//   const user = await verifyLogin(email, password)

//   if (!user) {
//     return json(
//       { errors: { email: 'Invalid email or password', password: null } },
//       { status: 400 },
//     )
//   }

//   return createUserSession({
//     request,
//     userId: user.id,
//     remember: remember === 'on' ? true : false,
//     redirectTo,
//   })
// }

export const meta: MetaFunction = () => {
  return {
    title: 'Login',
  }
}

export default function LoginPage() {
  return (
    <div className="flex h-full items-center p-16">
      <div className="w-2/5 rounded-xl bg-orange-50 p-8">
        <SignInForm onSubmit={() => {}} />
      </div>
    </div>
  )
}
