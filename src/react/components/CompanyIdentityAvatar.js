import React,{useMemo} from 'react';
import {View,Text} from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import {resolveFileImageUrl} from '@controleonline/ui-common/src/react/utils/fileUrl';
import UserAvatar from '@controleonline/ui-common/src/react/components/UserAvatar';
import {resolvePeopleDisplayName,resolvePeopleImageUrl} from '@controleonline/ui-people/src/react/utils/peopleImage';
import HomeAvatar from '@controleonline/../../src/components/HomeAvatar';
import {companyInitialsFromName} from '../utils/companyInitials';
const normalizeText = value => String(value || '').trim();
/**
 * companies/my returns icon/logo as FileService shape:
 *   { id, domain, url: '/files/{id}/download', fileType, public }
 * Not a plain string. Resolve to a download URL UserAvatar can auth-fetch.
 * (Same auth constraint as app-community#796 Media preview.)
 */
const resolveCompanyFileField = (field, company) => {
  if (!field) {
    return '';
  }
  if (typeof field === 'string') {
    const direct = normalizeText(field);
    if (!direct) {
      return '';
    }
    return normalizeText(resolveFileImageUrl(direct, {company}) || direct);
  }
  if (typeof field === 'object') {
    const fromHelper = normalizeText(resolveFileImageUrl(field, {company}));
    if (fromHelper) {
      return fromHelper;
    }
    const nestedUrl = normalizeText(field.url || field.uri || field.path);
    if (nestedUrl) {
      return normalizeText(resolveFileImageUrl(nestedUrl, {company}) || nestedUrl);
    }
  }
  return '';
};
/**
 * Fallback order (app-community#805 / linked #796):
 * 1) companies/my icon object/url
 * 2) companies/my logo object/url
 * 3) peopleImage (media + direct fields; peopleType forced J)
 * 4) UserAvatar initials (alias/name) — never empty chip
 */
const resolveCompanyIdentityImageUrl = company => {
  if (!company || typeof company !== 'object') {
    return '';
  }
  for (const key of ['icon', 'logo']) {
    const url = resolveCompanyFileField(company[key], company);
    if (url) {
      return url;
    }
  }
  return normalizeText(
    resolvePeopleImageUrl(
      {...company, peopleType: company.peopleType || 'J'},
      resolveFileImageUrl,
      {
        usePeopleImage: true,
        fileOptions: {company},
      },
    ),
  );
};
/**
 * Chip: associated icon/logo → company initials.
 */
const isCompanyEntity = company => {
  const type = normalizeText(
    company?.peopleType || company?.type || company?.personType || company?.people_type,
  ).toUpperCase();
  // companies/my items are always PJ; treat missing type as company.
  if (!type) {
    return true;
  }
  return type.startsWith('J');
};

const CompanyIdentityAvatar = ({
  home = false,
  company,
  size = 28,
  backgroundColor,
  borderColor,
  textColor,
  style,
}) => {
  const imageUrl = useMemo(
    () => resolveCompanyIdentityImageUrl(company),
    [company],
  );
  const Avatar = home ? HomeAvatar : UserAvatar;
  const name = useMemo(() => {
    const fromPeople = resolvePeopleDisplayName(company);
    if (fromPeople) {
      return fromPeople;
    }
    return normalizeText(company?.alias || company?.name || company?.id || '');
  }, [company]);
  const initials = useMemo(() => companyInitialsFromName(name), [name]);
  const isCompany = useMemo(() => isCompanyEntity(company), [company]);
  const chipStyle = [
    {
      width: size,
      height: size,
      borderRadius: Math.max(4, Math.round(size / 5)),
      backgroundColor,
      borderColor,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    style,
  ];
  // No usable image → initials, so company identity remains visible in every selector state.
  if (!imageUrl) {
    if (isCompany) {
      return (
        <View style={chipStyle}>
          <FAIcon
            name="building"
            size={Math.max(Math.round(size * 0.42), 10)}
            color={textColor}
          />
        </View>
      );
    }
    return (
      <View style={chipStyle}>
        <Text
          style={{
            color: textColor,
            fontSize: Math.max(Math.round(size * 0.38), 10),
            fontWeight: '700',
            letterSpacing: 0.3,
            textAlign: 'center',
          }}>
          {initials}
        </Text>
      </View>
    );
  }
  return (
    <Avatar
      imageUrl={imageUrl}
      name={name || initials}
      email=""
      size={size}
      backgroundColor={backgroundColor}
      borderColor={borderColor}
      borderWidth={1}
      textColor={textColor}
      useGravatar={false}
      style={style}
    />
  );
};
export default CompanyIdentityAvatar;
