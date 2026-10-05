"use client";
import {FormEvent,useState} from "react";
import {createClient} from "@/lib/supabase/client";
import {useRouter} from "next/navigation";
export default function LoginPage(){
 const router=useRouter();const[email,setEmail]=useState("");const[password,setPassword]=useState("");const[signup,setSignup]=useState(false);const[busy,setBusy]=useState(false);const[error,setError]=useState("");
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError("");const supabase=createClient();const result=signup?await supabase.auth.signUp({email,password,options:{emailRedirectTo:location.origin}}):await supabase.auth.signInWithPassword({email,password});if(result.error)setError(result.error.message);else router.push("/");setBusy(false)}
 return <main className="auth-shell"><form className="auth-card" onSubmit={submit}><div className="brand">TRAZ</div><h1>{signup?"Create your account":"Welcome back"}</h1><p className="muted">Intelligence, connected.</p><input className="input" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/><input className="input" type="password" placeholder="Password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} required/><button className="primary" disabled={busy}>{busy?"Please wait…":signup?"Create account":"Sign in"}</button>{error&&<p className="error">{error}</p>}<button type="button" className="link-button" onClick={()=>setSignup(!signup)}>{signup?"Already have an account? Sign in":"New to TRAZ? Create an account"}</button></form></main>
}