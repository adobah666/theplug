import { redirect } from 'next/navigation'

interface PageProps { params: Promise<{ category: string }> }

export default async function CategorySingularPage({ params }: PageProps) {
  // Redirect singular /category/:category to existing /categories/:category route
  const { category } = await params
  redirect(`/categories/${category}`)
}
