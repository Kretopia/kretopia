import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

/**
 * /join/:code route - stores invite code and redirects to auth
 * The code is stored in sessionStorage and auto-applied during signup
 */
const JoinWithCode = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      // Store the invite code in sessionStorage for the signup flow
      sessionStorage.setItem("invite_code", code.toUpperCase());
      console.log(`Invite code "${code}" stored for signup`);
    }
    
    // Redirect to auth page directly (skip install friction)
    navigate("/auth", { replace: true });
  }, [code, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
    </div>
  );
};

export default JoinWithCode;
