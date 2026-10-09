import { Link } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
export default function Button({
  children,
  to,
  href,
  variant = "primary",
  loading = false,
  className = "",
  ...props
}) {
  const classes = `button button-${variant} ${className}`;
  if (to)
    return (
      <Link className={classes} to={to} {...props}>
        {children}
      </Link>
    );
  if (href)
    return (
      <a className={classes} href={href} {...props}>
        {children}
      </a>
    );
  return (
    <button
      {...props}
      className={classes}
      disabled={loading || props.disabled}
      aria-busy={loading}
    >
      {loading ? <LoaderCircle className="spin" size={18} /> : null}
      {children}
    </button>
  );
}
