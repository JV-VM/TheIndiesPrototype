import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest
} from "@angular/common/http";
import { inject } from "@angular/core";
import { from, Observable, throwError } from "rxjs";
import { catchError, switchMap } from "rxjs/operators";

import { SKIP_AUTH } from "../http/http-context";
import { AuthService } from "./auth.service";

export const authInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);

  if (request.context.get(SKIP_AUTH)) {
    return next(request);
  }

  const accessToken = authService.accessToken();
  const requestWithAuth = accessToken
    ? request.clone({
        setHeaders: {
          authorization: `Bearer ${accessToken}`
        }
      })
    : request;

  return next(requestWithAuth).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      return from(authService.tryRefreshSession()).pipe(
        switchMap((recovered) => {
          if (!recovered) {
            return from(authService.handleUnauthorized()).pipe(
              switchMap(() => throwError(() => error))
            );
          }

          const refreshedToken = authService.accessToken();

          if (!refreshedToken) {
            return throwError(() => error);
          }

          return next(
            request.clone({
              setHeaders: {
                authorization: `Bearer ${refreshedToken}`
              }
            })
          );
        }),
        catchError((refreshError: unknown) =>
          from(authService.handleUnauthorized()).pipe(
            switchMap(() => throwError(() => refreshError))
          )
        )
      );
    })
  );
};
