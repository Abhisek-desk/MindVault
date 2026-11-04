import { createBrowserRouter } from "react-router-dom";

import NotFound from "../components/common/NotFound";

function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F1E5]">
      {" "}
      <div className="text-center">
        {" "}
        <h1 className="text-5xl font-bold text-[#17243D]">Mind Vault </h1>
        <p className="mt-3 text-[#85858A]">
          Your Knowledge. Your Memory. Always Available.
        </p>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

export default router;
