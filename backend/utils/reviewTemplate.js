export function generateReviewEmailHtml(tutorEmail, studentEmail, sessionId, role = "student") {
  const baseUrl = "http://localhost:5173/review.html"; 

  const reviewLink = `${baseUrl}?sessionId=${sessionId}&tutorEmail=${encodeURIComponent(
    tutorEmail
  )}&studentEmail=${encodeURIComponent(studentEmail)}&role=${role}`;

  const greeting =
    role === "student"
      ? "We hope you enjoyed your recent tutoring session!"
      : "Thank you for mentoring your student through EzPremium Tutors!";

  const instruction =
    role === "student"
      ? "Please take a moment to rate your tutor and provide feedback."
      : "Please take a moment to rate your student and provide feedback.";

  return `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2>${greeting}</h2>
      <p>${instruction}</p>
      <p style="margin: 20px 0;">
        <a href="${reviewLink}" target="_blank" style="display: inline-block; padding: 12px 20px; background-color: #f57c00; color: white; text-decoration: none; border-radius: 5px;">
          Leave a Review
        </a>
      </p>
      <p>Thanks for being a valued part of the EzPremium Tutors platform!</p>
    </div>
  `;
}
