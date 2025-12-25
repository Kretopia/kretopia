import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  type?: string;
  image?: string;
  url?: string;
}

export const SEO = ({
  title = "ThriveIN - Connect, Collaborate & Create with Creatives",
  description = "ThriveIN is a creative platform that allows talents such as singers, producers, musicians, models and others, to find each other, apply for jobs and collaborate—all in one place.",
  type = "website",
  image = "https://lovable.dev/opengraph-image-p98pqg.png",
  url
}: SEOProps) => {
  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url || window.location.href} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url || window.location.href} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />

      {/* Canonical URL */}
      {url && <link rel="canonical" href={url} />}
    </Helmet>
  );
};
