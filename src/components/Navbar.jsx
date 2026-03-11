import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();

  const links = [
    { name: "Dashboard", path: "/" },
    { name: "Ofitsiant", path: "/ofitsant" },
    { name: "Kassa", path: "/kassa" },
    { name: "Oshxona", path: "/oshxona" },
  ];

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm py-3">
      <div className="container-fluid px-4">
        <Link className="navbar-brand fw-bold" style={{ letterSpacing: '1px' }} to="/">
          <span style={{ color: '#F59E0B' }}>MODME</span> RESTO
        </Link>
        
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            {links.map((link) => (
              <li className="nav-item mx-2" key={link.path}>
                <Link
                  className={`nav-link px-3 rounded-pill ${location.pathname === link.path ? "active bg-primary" : ""}`}
                  to={link.path}
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}