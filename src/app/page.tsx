import { BoxIcon, GearIcon, GridIcon } from '@radix-ui/react-icons';
import Link from 'next/link';

interface NavigationCardProps {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

function NavigationCard({
  href,
  title,
  description,
  icon,
}: NavigationCardProps) {
  return (
    <Link
      href={href}
      className="block p-6 rounded-lg border bg-card text-card-foreground hover:bg-secondary/50 transition-colors"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-md bg-primary/10 text-primary">{icon}</div>
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      <p className="text-muted-foreground">{description}</p>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="container py-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Media Manager</h1>
          <p className="text-xl text-muted-foreground">
            Organize and manage your media collection
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <NavigationCard
            href="/folders"
            title="Folder View"
            description="Browse your media organized by folder structure."
            icon={<BoxIcon className="h-6 w-6" />}
          />
          <NavigationCard
            href="/browse"
            title="Media Browser"
            description="Browse all media with advanced filtering and organization tools."
            icon={<GridIcon className="h-6 w-6" />}
          />
          <NavigationCard
            href="/admin"
            title="Admin Panel"
            description="Manage system settings, run actions, and view statistics."
            icon={<GearIcon className="h-6 w-6" />}
          />
        </div>
      </div>
    </div>
  );
}
