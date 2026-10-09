import Button from "../components/Button";
export default function NotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="not-found page-enter">
      <span className="eyebrow">404 · A SMALL DETOUR</span>
      <h1>This path doesn’t lead anywhere.</h1>
      <p>Let’s get you back to a clearer starting point.</p>
      <Button to="/">Back to home</Button>
    </main>
  );
}
