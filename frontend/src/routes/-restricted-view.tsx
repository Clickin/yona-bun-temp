import * as React from "react";

export function RestrictedPage(props: {
  emailAddress: string;
  isConfirmed: boolean;
  loginId: string;
  userLabel: string;
}) {
  return (
    <main>
      <h1>Sshhh…don't tell anyone!</h1>
      <p>
        <iframe
          allowFullScreen
          frameBorder={0}
          height={315}
          src="https://www.youtube.com/embed/9bZkp7q19f0"
          title="restricted.video"
          width={560}
        ></iframe>
      </p>
      <p>
        Your name is {props.userLabel} and your email address is {props.emailAddress}{" "}
        <i>{props.isConfirmed ? "(verified)" : "(unverified)"}</i>!
        <br />
        Logged in with provider 'local' and the user ID '{props.loginId}'
        <br />
        Your session expires never
      </p>
    </main>
  );
}
