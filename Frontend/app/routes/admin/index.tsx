import { useEffect } from "react";
import { useNavigate } from "react-router";

export default function AdminIndex() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate("/admin/dashboard", { replace: true });
  }, [navigate]);

  return null;
}