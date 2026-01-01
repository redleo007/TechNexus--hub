export class ValidationError extends Error {
  constructor(public field: string, message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateEventData = (data: any): void => {
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    throw new ValidationError('name', 'Event name is required and must be a non-empty string');
  }
  if (!data.date || !isValidDate(data.date)) {
    throw new ValidationError('date', 'Valid event date is required');
  }
  if (data.location && typeof data.location !== 'string') {
    throw new ValidationError('location', 'Location must be a string');
  }
};

export const validateParticipantData = (data: any): void => {
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    throw new ValidationError('name', 'Participant name is required');
  }
  if (!data.email || !validateEmail(data.email)) {
    throw new ValidationError('email', 'Valid email is required');
  }
};

export const validateVolunteerData = (data: any): void => {
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    throw new ValidationError('name', 'Volunteer name is required');
  }
  if (!data.email || !validateEmail(data.email)) {
    throw new ValidationError('email', 'Valid email is required');
  }
  if (!data.comment || typeof data.comment !== 'string' || data.comment.trim().length === 0) {
    throw new ValidationError('comment', 'Volunteer comment is required');
  }
};

export const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};
