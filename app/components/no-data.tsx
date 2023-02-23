import { PropsWithChildren } from 'react'
import { useTranslations } from 'use-intl'
import { CiMoneyCheck1 } from 'react-icons/ci'

export function NoData({ children }: PropsWithChildren) {
  const t = useTranslations()
  return (
    <div className="flex-grow rounded-xl border border-primary">
      <div className="m-auto flex h-full flex-col items-center justify-center gap-4 p-8 text-center text-primary">
        <CiMoneyCheck1 size={128} className="-my-4" />
        <h2>{t('common.nothing-to-see')}</h2>
        <p>{children}</p>
      </div>
    </div>
  )
}