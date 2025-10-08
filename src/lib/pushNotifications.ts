import { supabase } from "@/integrations/supabase/client";

export type NotificationType = 'match' | 'message' | 'opportunity' | 'milestone' | 'general';

interface SendPushNotificationParams {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  link?: string;
  icon?: string;
  data?: Record<string, any>;
}

/**
 * Send a push notification to a user
 * This creates an in-app notification and triggers a push notification if they're subscribed
 */
export async function sendPushNotification(params: SendPushNotificationParams) {
  const { userId, title, body, type, link, icon, data } = params;

  try {
    // Create in-app notification
    const { error: notifError } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        title,
        message: body,
        type,
        link: link || null,
        image_url: icon || null,
        priority: type === 'match' || type === 'message' ? 'high' : 'normal',
        category: type,
      });

    if (notifError) {
      console.error("Error creating notification:", notifError);
    }

    // Trigger push notification via edge function
    const { error: pushError } = await supabase.functions.invoke("send-push-notification", {
      body: {
        userId,
        title,
        body,
        icon: icon || "/logo.png",
        data: {
          type,
          link,
          ...data,
        },
        tag: type, // Group notifications by type
      },
    });

    if (pushError) {
      console.error("Error sending push notification:", pushError);
    }

    return { success: true };
  } catch (error) {
    console.error("Error in sendPushNotification:", error);
    return { success: false, error };
  }
}

/**
 * Send match notification to both users
 */
export async function notifyMatch(user1Id: string, user2Id: string, user1Name: string, user2Name: string) {
  await Promise.all([
    sendPushNotification({
      userId: user1Id,
      title: "New Match! 🎉",
      body: `You matched with ${user2Name}`,
      type: "match",
      link: "/circle",
      data: { matchedUserId: user2Id },
    }),
    sendPushNotification({
      userId: user2Id,
      title: "New Match! 🎉",
      body: `You matched with ${user1Name}`,
      type: "match",
      link: "/circle",
      data: { matchedUserId: user1Id },
    }),
  ]);
}

/**
 * Send message notification
 */
export async function notifyMessage(receiverId: string, senderName: string, messagePreview: string) {
  await sendPushNotification({
    userId: receiverId,
    title: `New message from ${senderName}`,
    body: messagePreview,
    type: "message",
    link: "/messages",
  });
}

/**
 * Send opportunity notification
 */
export async function notifyOpportunity(userId: string, opportunityTitle: string, opportunityId: string) {
  await sendPushNotification({
    userId,
    title: "New Opportunity Match!",
    body: `Check out: ${opportunityTitle}`,
    type: "opportunity",
    link: `/opportunity/${opportunityId}`,
  });
}

/**
 * Send milestone notification
 */
export async function notifyMilestone(userId: string, projectTitle: string, milestoneTitle: string) {
  await sendPushNotification({
    userId,
    title: "Milestone Update",
    body: `${milestoneTitle} in ${projectTitle}`,
    type: "milestone",
    link: "/projects",
  });
}
