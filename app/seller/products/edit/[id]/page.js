import EditProductClient from "./EditProductClient";

export default function EditProductPage({ params }) {
  return <EditProductClient productId={params.id} />;
}
