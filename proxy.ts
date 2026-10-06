import {type NextRequest} from "next/server";
import {NextResponse} from "next/server";

export function proxy(request:NextRequest){
  if(request.nextUrl.pathname === "/"){
    return NextResponse.redirect(new URL("/home", request.url));
  }
  return NextResponse.next();
}

export const config={
  matcher:["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
