import { useRef } from 'react'

export default function MediaUpload({ onFile }) {
  const ref = useRef()
  const handleChange = (e) => {
    const file = e.target.files?.[0]
    if (file) { onFile(file); e.target.value = '' }
  }
  return (
    <>
      <button type="button" onClick={() => ref.current?.click()}
        className="text-gray-500 hover:text-green-600 p-2 rounded-lg hover:bg-gray-100 text-lg"
        title="Attach file">
        [+]
      </button>
      <input ref={ref} type="file" className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
        onChange={handleChange} />
    </>
  )
}
