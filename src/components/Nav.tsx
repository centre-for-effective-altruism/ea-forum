"use client";

import type { ComponentProps } from "react";
import { usePathname } from 'next/navigation'
import HomeIcon from "@heroicons/react/24/outline/HomeIcon";
import HomeSelectedIcon from "@heroicons/react/20/solid/HomeIcon";
import StarIcon from "@heroicons/react/24/outline/StarIcon";
import StarSelectedIcon from "@heroicons/react/24/solid/StarIcon";
import ArchiveBoxIcon from "@heroicons/react/24/outline/ArchiveBoxIcon";
import ArchiveBoxSelectedIcon from "@heroicons/react/24/solid/ArchiveBoxIcon";
import TagIcon from "@heroicons/react/24/outline/TagIcon";
import TagSelectedIcon from "@heroicons/react/24/solid/TagIcon";
import HeartIcon from "@heroicons/react/24/outline/HeartIcon";
import HeartSelectedIcon from "@heroicons/react/24/solid/HeartIcon";
import CalendarIcon from "@heroicons/react/24/outline/CalendarIcon";
import CalendarSelectedIcon from "@heroicons/react/24/solid/CalendarIcon";
import UserGroupIcon from "@heroicons/react/24/outline/UserGroupIcon";
import UserGroupSelectedIcon from "@heroicons/react/24/solid/UserGroupIcon";
import NavItem from "./NavItem";
import NavHr from "./NavHr";
import NavLink from "./NavLink";

const items = [
  {
    title: "Home",
    href: "/",
    description: "See recent posts on strategies for doing the most good, plus recent activity from all across the Forum",
    UnselectedIcon: HomeIcon,
    SelectedIcon: HomeSelectedIcon,
  },
  {
    title: "Best of the Forum",
    href: "/best-of",
    description: "Curated by the Forum team",
    UnselectedIcon: StarIcon,
    SelectedIcon: StarSelectedIcon,
  },
  {
    title: "All posts",
    href: "/allPosts",
    description: "See all posts, filtered and sorted by date, karma, and more",
    UnselectedIcon: ArchiveBoxIcon,
    SelectedIcon: ArchiveBoxSelectedIcon,
  },
  {
    title: "Topics",
    href: "/topics",
    description: "A sorted list of pages — “Topics” — in the EA Forum Wiki, which explains topics in EA and collects posts tagged with those topics",
    UnselectedIcon: TagIcon,
    SelectedIcon: TagSelectedIcon,
  },
  {
    title: "People directory",
    href: "/people-directory",
    description: "Search and filter Forum users",
    UnselectedIcon: ArchiveBoxIcon, // TODO
    SelectedIcon: ArchiveBoxSelectedIcon, // TODO
  },
  {
    title: "Take action",
    href: "/topics/opportunities-to-take-action",
    description: "Opportunities to get involved with impactful work",
    UnselectedIcon: HeartIcon,
    SelectedIcon: HeartSelectedIcon,
  },
  {
    title: "Events",
    href: "/events",
    description: "Upcoming events near you",
    UnselectedIcon: CalendarIcon,
    SelectedIcon: CalendarSelectedIcon,
  },
  {
    title: "Groups directory",
    href: "/groups",
    description: "Join a group near you or meet others online",
    UnselectedIcon: UserGroupIcon,
    SelectedIcon: UserGroupSelectedIcon,
  },
] satisfies Pick<
  ComponentProps<typeof NavItem>,
  "title" | "href" | "description" | "UnselectedIcon" | "SelectedIcon"
>[];

const links = [
  {
    title: "How to use the Forum",
    href: "/about",
  },
  {
    title: "EA Handbook",
    href: "/handbook",
  },
  {
    title: "EA Forum Podcast",
    href: "/posts/K5Snxo5EhgmwJJjR2/announcing-ea-forum-podcast-audio-narrations-of-ea-forum",
  },
  {
    title: "Quick takes",
    href: "/quicktakes",
  },
  {
    title: "Cookie policy",
    href: "/cookiePolicy",
  },
  {
    title: "Copyright",
    href: "/posts/KK6AE8HzPkR2KnqSg/new-forum-license-creative-commons",
  },
] satisfies Pick<ComponentProps<typeof NavLink>, "title" | "href">[];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="w-[250px]" data-component="Nav">
      {items.map(({href, ...props}) => (
        <NavItem
          key={href}
          href={href}
          isSelected={pathname === href}
          {...props}
        />
      ))}
      <NavHr />
      {links.map(({title, href}) => (
        <NavLink
          key={href}
          title={title}
          href={href}
          isSelected={pathname === href}
        />
      ))}
      <NavHr />
      <NavLink
        title="Contact us"
        href="/contact"
        isSelected={pathname === "/contact"}
      />
    </nav>
  )
}
