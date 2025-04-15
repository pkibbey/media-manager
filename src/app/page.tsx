import { ImageIcon } from '@radix-ui/react-icons';

export default function Home() {
  return (
    <main className="container py-10">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Media Manager</h1>
      </div>
    </main>
  );
}
