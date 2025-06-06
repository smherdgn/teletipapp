// src/utils/sanitizer.ts

const MASK_CHAR = '*';

export const Sanitizer = {
  maskEmail: (email?: string | null): string => {
    if (!email) return 'N/A';
    const parts = email.split('@');
    if (parts.length !== 2) return email; // Not a valid email format to mask

    const localPart = parts[0];
    const domainPart = parts[1];

    let maskedLocalPart;
    if (localPart.length <= 3) {
      maskedLocalPart = MASK_CHAR.repeat(localPart.length);
    } else {
      maskedLocalPart = localPart.substring(0, 2) + MASK_CHAR.repeat(Math.max(0, localPart.length - 3)) + localPart.slice(-1);
    }
    
    const domainParts = domainPart.split('.');
    const maskedDomainName = domainParts[0].length > 1 
        ? domainParts[0].substring(0,1) + MASK_CHAR.repeat(domainParts[0].length-1) 
        : MASK_CHAR.repeat(domainParts[0].length);
    const maskedDomain = maskedDomainName + (domainParts.length > 1 ? `.${domainParts.slice(1).join('.')}` : '');

    return `${maskedLocalPart}@${maskedDomain}`;
  },

  maskIpAddress: (ip?: string | null): string => {
    if (!ip) return 'N/A';
    // Simple IPv4 mask
    if (ip.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
        const octets = ip.split('.');
        return `${octets[0]}.${octets[1]}.XXX.XXX`;
    }
    // Basic IPv6 mask (simplified: masks last few segments)
    if (ip.includes(':')) {
        const parts = ip.split(':');
        if (parts.length > 4) { // Mask roughly half if long enough
            return parts.slice(0, Math.max(1, parts.length - 4)).join(':') + ':XXXX:XXXX:XXXX';
        } else if (parts.length > 2) {
            return parts.slice(0, 1).join(':') + ':XXXX:XXXX';
        }
        return 'XXXX:XXXX... (Masked IPv6)';
    }
    return 'X.X.X.X (Masked IP)'; // Fallback
  },

  maskUserId: (userId?: string | null): string => {
    if (!userId) return 'N/A';
    if (userId.length <= 4) {
      return MASK_CHAR.repeat(userId.length);
    }
    return `${userId.substring(0, 2)}${MASK_CHAR.repeat(userId.length - 4)}${userId.substring(userId.length - 2)}`;
  },

  maskGenericPii: (value?: string | number | null): string => {
    if (value === null || typeof value === 'undefined') return 'N/A';
    const strValue = String(value);
    if (strValue.length <= 3) return MASK_CHAR.repeat(strValue.length);
    return `${strValue.substring(0, 1)}${MASK_CHAR.repeat(Math.max(0, strValue.length - 2))}${strValue.substring(strValue.length - 1)}`;
  },

  // Sanitizes an object by masking known PII fields
  sanitizeObject: (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      if (typeof obj === 'string' && (obj.includes('@') && obj.includes('.'))) { // Basic email check
        return Sanitizer.maskEmail(obj);
      }
      return obj;
    }

    const newObj = Array.isArray(obj) ? [] : ({} as any);

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        
        if (typeof value === 'object' && value !== null) {
          newObj[key] = Sanitizer.sanitizeObject(value); // Recursive sanitization
        } else if (typeof value === 'string') {
          const lowerKey = key.toLowerCase();
          if (lowerKey.includes('email') || (lowerKey === 'username' && value.includes('@'))) {
            newObj[key] = Sanitizer.maskEmail(value);
          } else if (lowerKey.includes('ip') || lowerKey.includes('ipaddress') || lowerKey === 'ip_address') {
            newObj[key] = Sanitizer.maskIpAddress(value);
          } else if (lowerKey.includes('userid') || lowerKey.includes('user_id') || lowerKey === 'id' || lowerKey.includes('sessionid') || lowerKey.includes('clientid') || lowerKey.includes('participantid')) {
             // More cautious with generic 'id' if it's not always PII, but for user-related IDs, mask.
            newObj[key] = Sanitizer.maskUserId(value);
          } else if (lowerKey.includes('password') || lowerKey.includes('token') || lowerKey.includes('secret') || lowerKey.includes('apikey') || lowerKey.includes('credentials')) {
            newObj[key] = '********';
          }
          // Example: Mask full names if a field is explicitly 'fullName' or 'name' (but not 'username')
          // else if ((lowerKey === 'name' || lowerKey === 'fullname') && !lowerKey.includes('username') && !lowerKey.includes('filename')) {
          //   newObj[key] = Sanitizer.maskGenericPii(value);
          // }
           else {
            newObj[key] = value;
          }
        } else {
          newObj[key] = value;
        }
      }
    }
    return newObj;
  },
};