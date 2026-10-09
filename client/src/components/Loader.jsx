import { LoaderCircle } from "lucide-react";
export default function Loader() {
  return (
    <div className="auth-loader" role="status">
      <LoaderCircle size={30} className="spin" />
      <span>Getting your space ready</span>
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
    </div>
  );
}
