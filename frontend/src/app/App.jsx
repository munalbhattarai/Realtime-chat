import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import ProtectedRoute from "../components/common/ProtectedRoute";

import Login from "../pages/Login";
import Register from "../pages/Register";
import Chat from "../pages/Chat";

const App = () => {
  return (
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
  );
};

export default App;