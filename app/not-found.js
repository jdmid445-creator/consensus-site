import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="wrap empty-state">
      <h1 className="display">Nothing ran here.</h1>
      <p className="lede">This page doesn&apos;t exist. The meta is on the front page.</p>
      <p><Link href="/" className="btn btn-ink">Go to the front page</Link></p>
    </section>
  );
}
