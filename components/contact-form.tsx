"use client";

import { useState, type FormEvent } from "react";

export function ContactForm({ contactEmail }: { contactEmail: string }) {
  const [error, setError] = useState("");

  function openEmailDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const senderEmail = String(formData.get("email") ?? "").trim();
    const subject = String(formData.get("subject") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();

    if (!name || !senderEmail || !subject || !message) {
      setError("Please complete every field before continuing.");
      return;
    }

    const body = `Name: ${name}\nEmail: ${senderEmail}\n\n${message}`;
    const gmailComposeUrl = new URL("https://mail.google.com/mail/");
    gmailComposeUrl.searchParams.set("view", "cm");
    gmailComposeUrl.searchParams.set("fs", "1");
    gmailComposeUrl.searchParams.set("to", contactEmail);
    gmailComposeUrl.searchParams.set("su", subject);
    gmailComposeUrl.searchParams.set("body", body);
    window.open(gmailComposeUrl.toString(), "_blank", "noopener,noreferrer");
    setError("");
  }

  return (
    <section className="contact-form-panel">
      <span className="eyebrow">Send us a message</span>
      <h2>How can we <em>help?</em></h2>
      <p className="contact-form-note">Open a prefilled Gmail draft, review your message, then send it from Gmail.</p>
      <form className="contact-form" onSubmit={openEmailDraft}>
        <label>Your name<input name="name" autoComplete="name" required maxLength={100} /></label>
        <label>Your email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
        <label>Subject<input name="subject" required maxLength={180} /></label>
        <label>Your message<textarea name="message" required rows={6} maxLength={5000} /></label>
        {error && <p role="alert" className="contact-form-error">{error}</p>}
        <button className="button-dark" type="submit">Open Gmail to send message <span>→</span></button>
      </form>
    </section>
  );
}
