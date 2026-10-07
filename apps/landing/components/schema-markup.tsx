export function SchemaMarkup() {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'KinoBot',
        url: 'https://kinobot.uz',
        email: 'info@kinobot.uz',
        description:
          'Telegram bot va admin panel platformasi. Kino biznesingizni avtomatlashtiring.',
        areaServed: "O'zbekiston",
      },
      {
        '@type': 'WebSite',
        name: 'KinoBot',
        url: 'https://kinobot.uz',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://kinobot.uz/?q={search_term_string}',
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
