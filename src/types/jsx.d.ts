import 'react';

declare module 'react' {
  interface InputHTMLAttributes<T> {
    webkitdirectory?: boolean;
    mozdirectory?: boolean;
    directory?: boolean;
  }
}
