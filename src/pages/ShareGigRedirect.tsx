import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

/**
 * Client-side fallback for /share/gig/:id routes.
 * The Vite build plugin generates static HTML share pages with OG meta tags,
 * but SPA fallback routing may serve index.html instead.
 * This component ensures the user is redirected to the actual opportunity page.
 */
const ShareGigRedirect = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      navigate(`/opportunity/${id}`, { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [id, navigate]);

  return null;
};

export default ShareGigRedirect;
