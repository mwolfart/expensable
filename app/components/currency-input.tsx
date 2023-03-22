import type { ChangeEventHandler, InputHTMLAttributes } from 'react'
import { useState } from 'react'

type Props = {
  value?: string
} & InputHTMLAttributes<HTMLInputElement>

export function CurrencyInput({ value, onChange, ...props }: Props) {
  const [innerValue, setInnerValue] = useState(value || '')

  const innerChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    const numeric = evt.target.value.replace(/[^0-9]/g, '')
    const multiplied = numeric ? parseFloat(numeric) / 100 : 0
    const formatted = `$${multiplied.toFixed(2)}`
    setInnerValue(formatted)
    evt.target.value = formatted
    if (onChange) {
      onChange(evt)
    }
  }

  return <input value={innerValue} onChange={innerChange} {...props} />
}
