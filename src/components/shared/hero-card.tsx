import Link from "next/link";

import { Card, CardDescription, CardHeader } from "@/components/ui/card";

type HeroCardProps = {
  title: string;
  description: string;
  href: string;
};

export function HeroCard({ title, description, href }: HeroCardProps) {
  return (
    <Link
      href={href}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="h-full transition-colors group-hover:border-foreground/20 group-hover:bg-accent/40">
        <CardHeader>
          <h3 className="text-lg leading-none font-semibold">{title}</h3>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
