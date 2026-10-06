"use client";
import {useState} from "react";

export default function LoginPage(){
 const [busy,setBusy]=useState(false);
 const login=()=>{setBusy(true);window.location.assign("/api/auth/login")};
 return <main className="auth-shell"><div className="auth-card"><div className="brand">TRAZ</div><h1>Welcome to TRAZ</h1><p className="muted">Intelligence, connected.</p><button className="primary" onClick={login} disabled={busy}>{busy?"Connecting…":"Continue with Google"}</button></div></main>;
}