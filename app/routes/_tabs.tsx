import type { LoaderFunctionArgs } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import { Outlet, useLoaderData, useLocation, useSubmit } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import { DialogProvider } from '~/presentation/providers/dialog'
import { getLoggedUserProfile } from '~/infra/session.server'
import { MdOutlineCategory } from 'react-icons/md'
import { GoCreditCard, GoGraph } from 'react-icons/go'
import { AiOutlineShoppingCart } from 'react-icons/ai'
import { FaMoneyBillTransfer } from 'react-icons/fa6'
import { CategoryProvider } from '~/presentation/providers/category'
import { ToastProvider } from '~/presentation/providers/toast'

const enableLangSwitcher = false

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getLoggedUserProfile(request)
  if (!user) {
    return redirect('/login')
  }
  return json(user)
}

export default function Index() {
  const { t, i18n } = useTranslation()
  const user = useLoaderData<typeof loader>()
  const submit = useSubmit()
  const { pathname } = useLocation()

  const setLanguage = (lang: string) => {
    if (enableLangSwitcher) {
      i18n.changeLanguage(lang)
    }
  }

  const getTabClass = (path: string) =>
    `btn normal-case px-2 xs:px-3 sm:px-4 ${
      path === pathname
        ? 'btn-primary'
        : 'btn-ghost text-primary hover:bg-primary hover:text-white'
    }`

  return (
    <CategoryProvider>
      <ToastProvider>
        <DialogProvider>
          <main className="relative flex h-full flex-grow flex-col xs:p-8 sm:p-16 sm:pt-0">
            <div className="hidden flex-row justify-end gap-8 p-4 sm:flex">
              <p className="flex items-center text-sm text-primary">
                {t('home.logged-in-as', { user: user?.fullName })}
              </p>
              <div className="text-primary" aria-hidden={true}>
                |
              </div>
              <button
                className="btn-link btn px-0 text-sm"
                onClick={() =>
                  submit(null, { action: 'logout', method: 'post' })
                }
              >
                {t('common.logout')}
              </button>
            </div>
            <div className="flex flex-grow flex-col xs:rounded-2xl bg-foreground">
              <div className="flex gap-4 p-4 flex-wrap sm:flex-nowrap">
                <a className={getTabClass('/dashboard')} href="/">
                  <div className="hidden md:block">{t('home.dashboard')}</div>
                  <GoGraph className="block md:hidden" size={24} />
                </a>
                <a className={getTabClass('/expenses')} href="/expenses">
                  <div className="hidden md:block lg:hidden">
                    {t('home.expenses-short')}
                  </div>
                  <div className="hidden lg:block">{t('home.expenses')}</div>
                  <GoCreditCard className="block md:hidden" size={24} />
                </a>
                <a
                  className={getTabClass('/fixed-expenses')}
                  href="/fixed-expenses"
                >
                  <div className="hidden md:block lg:hidden">
                    {t('home.fixed-short')}
                  </div>
                  <div className="hidden lg:block">{t('home.fixed')}</div>
                  <FaMoneyBillTransfer className="block md:hidden" size={24} />
                </a>
                <a className={getTabClass('/categories')} href="/categories">
                  <div className="hidden md:block">{t('home.categories')}</div>
                  <MdOutlineCategory className="block md:hidden" size={24} />
                </a>
                <a
                  className={getTabClass('/transactions')}
                  href="/transactions"
                >
                  <div className="hidden md:block">
                    {t('home.transactions')}
                  </div>
                  <AiOutlineShoppingCart
                    className="block md:hidden"
                    size={24}
                  />
                </a>
              </div>
              <Outlet />
            </div>
            {enableLangSwitcher && (
              <div className="py-4 flex flex-row gap-2">
                {t('common.viewing-website-in')}
                <div className="flex flex-row">
                  <button
                    className="btn-link btn"
                    type="button"
                    onClick={() => setLanguage('en')}
                  >
                    {t('common.english')}
                  </button>
                  <button
                    className="btn-link btn"
                    type="button"
                    onClick={() => setLanguage('pt-BR')}
                  >
                    {t('common.portuguese')}
                  </button>
                </div>
              </div>
            )}
          </main>
        </DialogProvider>
      </ToastProvider>
    </CategoryProvider>
  )
}
