import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to circle (main app destination) for any unknown routes
    navigate("/circle", { replace: true });
  }, [navigate]);

  return null;
};

export default NotFound;
