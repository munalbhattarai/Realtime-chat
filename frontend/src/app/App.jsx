import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import ProtectedRoute from "../components/common/ProtectedRoute";
import PWAInstallBanner from "../components/pwa/PWAInstallBanner";
import PWAUpdateReload from "../components/pwa/PWAUpdateReload";

import Login from "../pages/Login";
import Register from "../pages/Register";
import Chat from "../pages/Chat";

const App = () => {
  return (
    <div className="flex-1 flex flex-col min-h-0 w-full h-full">
      <Routes>
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route element={<ProtectedRoute />}>
          <Route
            path="/chat"
            element={<Chat />}
          />
        </Route>

        <Route
          path="*"
          element={
            <Navigate
              to="/chat"
              replace
            />
          }
        />
      </Routes>

      {/* PWA Components */}
      <PWAInstallBanner />
      <PWAUpdateReload />
    </div>
  );
};

export default App;