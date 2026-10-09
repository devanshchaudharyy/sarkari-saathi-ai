import { Landmark } from "lucide-react";
import { Link } from "react-router-dom";
export default function Brand() {
  return (
    <Link className="brand" to="/" title="SarkariSaathi AI home">
      <span className="brand-mark">
        <Landmark size={23} />
      </span>
      <span>
        Sarkari<span className="brand-light">Saathi</span>
        <small>AI</small>
      </span>
    </Link>
  );
}
