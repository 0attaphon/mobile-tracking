'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { loginAction, type LoginState } from './actions'

const initialState: LoginState = {}

export default function LoginForm() {
  const searchParams = useSearchParams()
  const urlError =
    searchParams.get('error') === 'not_admin' ? 'บัญชีนี้ไม่มีสิทธิ์ admin' : null

  const [state, formAction, pending] = useActionState(loginAction, initialState)
  const error = state.error ?? urlError

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        action={formAction}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8"
      >
        <h1 className="text-2xl font-bold mb-2">BUDDY RISE Admin</h1>
        <p className="text-slate-400 text-sm mb-6">เข้าสู่ระบบสำหรับผู้ดูแล</p>

        <label className="block text-sm text-slate-300 mb-1">ชื่อผู้ใช้</label>
        <input
          name="username"
          type="text"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="username"
          className="w-full mb-4 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
          required
        />

        <label className="block text-sm text-slate-300 mb-1">รหัสผ่าน</label>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          className="w-full mb-4 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white"
          required
        />

        {error ? <p className="text-red-400 text-sm mb-4">{error}</p> : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg py-2 font-medium"
        >
          {pending ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>

        <p className="text-slate-500 text-xs mt-4 text-center">
          ใช้ username เช่น <span className="text-slate-400">admin</span> (ไม่ใช่ email)
        </p>
      </form>
    </div>
  )
}
