import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
  Hr,
} from '@react-email/components';

const SignupConfirmation = () => {
  return (
    <Html>
      <Head />
      <Preview>Confirm your email address to get started</Preview>
      <Tailwind>
        <Body className="bg-[#f6f9fc] font-sans py-[40px]">
          <Container className="bg-white rounded-[8px] p-[20px] mx-auto max-w-[600px]">
            <Section>
              <Heading className="text-[24px] font-bold text-[#333] mt-[0px] mb-[16px]">
                Confirm your email address
              </Heading>
              <Text className="text-[16px] leading-[24px] text-[#555] mb-[24px]">
                Hi there,
              </Text>
              <Text className="text-[16px] leading-[24px] text-[#555] mb-[24px]">
                Thanks for signing up! Please confirm your email address to activate your account and get started with our services.
              </Text>
              <Button
                className="bg-[#0070f3] text-white rounded-[4px] py-[12px] px-[20px] text-[16px] font-medium no-underline text-center box-border"
                href="https://example.com/confirm?token=123456789"
              >
                Confirm Email Address
              </Button>
              <Text className="text-[16px] leading-[24px] text-[#555] mt-[24px] mb-[24px]">
                If you didn&apos;t create an account, you can safely ignore this email.
              </Text>
              <Text className="text-[16px] leading-[24px] text-[#555] mb-[24px]">
                This confirmation link will expire in 24 hours.
              </Text>
              <Text className="text-[16px] leading-[24px] text-[#555] mb-[8px]">
                If the button above doesn&apos;t work, copy and paste the following link into your browser:
              </Text>
              <Text className="text-[14px] leading-[20px] text-[#777] mb-[24px]">
                https://example.com/confirm?token=123456789
              </Text>
              <Hr className="border-solid border-[#e6ebf1] my-[24px]" />
              <Text className="text-[14px] leading-[20px] text-[#777] mb-[8px]">
                Need help? Contact our support team at support@example.com
              </Text>
            </Section>
            <Section>
              <Text className="text-[12px] leading-[16px] text-[#999] m-0">
                123 Main Street, Anytown, CA 12345
              </Text>
              <Text className="text-[12px] leading-[16px] text-[#999] m-0">
                &copy; 2025 Your Company. All rights reserved.
              </Text>
              <Text className="text-[12px] leading-[16px] text-[#999] mt-[8px]">
                <a href="https://example.com/unsubscribe" className="text-[#999] underline">
                  Unsubscribe
                </a>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default SignupConfirmation;