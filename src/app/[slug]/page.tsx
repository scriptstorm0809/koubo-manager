import { notFound } from 'next/navigation'
import { getScript } from '@/lib/scripts'
import ScriptPage from './ScriptPage'

export const revalidate = 60

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const script = await getScript(slug)
  return { title: script?.title || slug }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  const script = await getScript(slug)

  if (!script) notFound()

  return (
    <ScriptPage
      script={{
        slug: script.slug,
        title: script.title,
        wordCount: script.wordCount,
        estimatedDuration: script.estimatedDuration,
        contentHtml: script.contentHtml,
      }}
    />
  )
}
