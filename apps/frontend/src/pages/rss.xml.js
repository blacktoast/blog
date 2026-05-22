import { getCollection } from "astro:content";
import rss from "@astrojs/rss";
import { PERSONAL_TAGS, SITE_DESCRIPTION, SITE_TITLE } from "../constants";

export async function GET(context) {
  const isPersonal = import.meta.env.PUBLIC_TYPE === "personal";
  const posts = (await getCollection("blog")).filter((post) =>
    isPersonal ? true : !post.data.tags.some((tag) => PERSONAL_TAGS.includes(tag))
  );
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: posts.map((post) => ({
      ...post.data,
      link: `/blog/${post.id}/`,
    })),
  });
}
