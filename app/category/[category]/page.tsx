import { redirect } from 'next/navigation'

export default function CategorySingularPage({ params }: { params: { category: string } }) {
  // Redirect singular /category/:category to existing /categories/:category route
  redirect(`/categories/${params.category}`)
}
