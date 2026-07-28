import CityCanvas from "@/components/canvas/CityCanvas";

export default async function CityPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return (
    <main className="w-screen h-screen overflow-hidden">
      <CityCanvas cityId={resolvedParams.id} />
    </main>
  );
}
