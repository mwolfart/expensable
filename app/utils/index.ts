import cx from 'classnames'

export const cxWithFade = (baseClasses: string, active?: boolean) => {
  return cx(
    `${baseClasses} transition`,
    !active && 'pointer-events-none opacity-0',
    active && 'opacity-100',
  )
}

export const cxWithGrowMd = (baseClasses: string, active?: boolean) => {
  return cx(
    `${baseClasses} transition-height duration-300`,
    !active && 'max-h-0 opacity-0 invisible',
    active && 'max-h-64 opacity-1 visible',
  )
}

export const cxFormInput = ({
  hasError,
  extraClasses,
}: {
  hasError?: boolean
  extraClasses?: string
}) => {
  return cx(
    'input w-full bg-white',
    hasError && 'border-error placeholder-error',
    extraClasses,
  )
}

export const getYupErrors = (yupError: any) => {
  const errorArray = yupError.inner.map(
    ({ path, errors: [code] }: any): { path: string; code: string } => ({
      path,
      code,
    }),
  ) as Array<{ path: string; code: string }>
  const errors = errorArray
    .reverse()
    .reduce((acc, { path, code }) => ({ ...acc, [path]: code }), {})
  return errors
}
